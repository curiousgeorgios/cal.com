import type { Prisma } from "@prisma/client";

import { HttpError } from "@calcom/lib/http-error";
import { CredentialRepository } from "@calcom/lib/server/repository/credential";
import prisma from "@calcom/prisma";
import type { UserProfile } from "@calcom/types/UserProfile";

export async function assertInstalled(slug: string, userId: number) {
  const alreadyInstalled = await CredentialRepository.findByAppIdAndUserId({ appId: slug, userId });
  if (alreadyInstalled) {
    throw new HttpError({ statusCode: 422, message: "Already installed" });
  }
}

export async function isAppInstalled({ appId, userId }: { appId: string; userId: number }) {
  const alreadyInstalled = await CredentialRepository.findByAppIdAndUserId({ appId, userId });
  return !!alreadyInstalled;
}

type InstallationArgs = {
  appType: string;
  user: {
    id: number;
    profile?: UserProfile;
  };
  slug: string;
  key?: Prisma.InputJsonValue;
  teamId?: number;
  subscriptionId?: string | null;
  paymentStatus?: string | null;
  billingCycleStart?: number | null;
  delegatedToId?: string;
};

export async function createDefaultInstallation({
  appType,
  user,
  slug,
  key = {},
  teamId,
  billingCycleStart,
  paymentStatus,
  subscriptionId,
  delegatedToId,
}: InstallationArgs) {
  const installation = await prisma.credential.create({
    data: {
      type: appType,
      key,
      ...(teamId ? { teamId } : { userId: user.id }),
      appId: slug,
      subscriptionId,
      paymentStatus,
      billingCycleStart,
      delegatedToId,
    },
  });
  if (!installation) {
    throw new Error(`Unable to create user credential for type ${appType}`);
  }
  return installation;
}
