import type { PageProps } from "~/getting-started/[[...step]]/onboarding-view";
import OnboardingPage from "~/getting-started/[[...step]]/onboarding-view";

const Page = (props: PageProps) => <OnboardingPage {...props} />;

export { getServerSideProps } from "@lib/getting-started/[[...step]]/getServerSideProps";
export default Page;
