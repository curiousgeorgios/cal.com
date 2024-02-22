import logger from "@calcom/lib/logger";
import { ProfileRepository } from "@calcom/lib/server/repository/profile";
import prisma from "@calcom/prisma";

const log = logger.getSubLogger({ prefix: ["removeMember"] });

const removeMember = async ({
  memberId,
  teamId,
  isOrg,
}: {
  memberId: number;
  teamId: number;
  isOrg: boolean;
}) => {
  const membership = await prisma.membership.delete({
    where: {
      userId_teamId: { userId: memberId, teamId: teamId },
    },
    include: {
      user: true,
      team: true,
    },
  });
  console.log("🚀 ~ membership:", membership);

  // remove user as host from team events associated with this membership
  await prisma.host.deleteMany({
    where: {
      userId: memberId,
      eventType: {
        teamId: teamId,
      },
    },
  });

  if (isOrg) {
    log.debug("Removing a member from the organization");

    // Deleting membership from all child teams
    const foundUser = await prisma.user.update({
      where: { id: memberId },
      data: {
        organizationId: null,
      },
      select: {
        id: true,
        movedToProfileId: true,
        email: true,
        username: true,
        completedOnboarding: true,
      },
    });

    if (!foundUser) throw new Error(`Could not find user with member id ${memberId}`);

    const orgInfo = await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        metadata: true,
      },
    });

    if (!orgInfo) throw new Error(`Could not find org with team id ${teamId}`);

    // Delete all sub-team memberships where this team is the organization
    await prisma.membership.deleteMany({
      where: {
        team: {
          parentId: teamId,
        },
        userId: membership.userId,
      },
    });

    const userToDeleteMembershipOf = foundUser;

    const profileToDelete = await ProfileRepository.findByUserIdAndOrgId({
      userId: userToDeleteMembershipOf.id,
      organizationId: orgInfo.id,
    });

    if (
      userToDeleteMembershipOf.username &&
      userToDeleteMembershipOf.movedToProfileId === profileToDelete?.id
    ) {
      log.debug("Cleaning up tempOrgRedirect for user", userToDeleteMembershipOf.username);

      await prisma.tempOrgRedirect.deleteMany({
        where: {
          from: userToDeleteMembershipOf.username,
        },
      });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: membership.userId },
        data: { organizationId: null },
      }),
      ProfileRepository.delete({
        userId: membership.userId,
        organizationId: orgInfo.id,
      }),
    ]);
  }

  // Deleted managed event types from this team from this member
  await prisma.eventType.deleteMany({
    where: { parent: { teamId: teamId }, userId: membership.userId },
  });

  return { membership };
};

export default removeMember;
