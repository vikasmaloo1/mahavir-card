export type GuidedAssistantAction = {
  label: string;
  href: string;
};

export type GuidedAssistantMessage = {
  heading: string;
  body: string;
  primary: GuidedAssistantAction;
  secondary?: GuidedAssistantAction;
};

const SHARE_REQUIREMENT: GuidedAssistantAction = { label: "Share Your Requirement", href: "/quote" };
const BROWSE_PRODUCTS: GuidedAssistantAction = { label: "Browse Products", href: "/products" };

const ROUTE_MESSAGES: { test: (path: string) => boolean; message: GuidedAssistantMessage }[] = [
  {
    test: (path) => path === "/",
    message: {
      heading: "Looking for something specific?",
      body: "Browse our printing products or tell us what you need.",
      primary: BROWSE_PRODUCTS,
      secondary: SHARE_REQUIREMENT,
    },
  },
  {
    test: (path) => path === "/products",
    message: {
      heading: "Can't find the printing job you're looking for?",
      body: "Not every requirement is listed online yet — share it and we'll check.",
      primary: SHARE_REQUIREMENT,
    },
  },
  {
    test: (path) => path.startsWith("/catalog/"),
    message: {
      heading: "Need help with this job?",
      body: "Review the options on this page, or tell us what you need for a direct quote.",
      primary: SHARE_REQUIREMENT,
    },
  },
  {
    test: (path) =>
      path === "/about" || path === "/commercial-offset-printing" || path === "/how-it-works" || path === "/contact",
    message: {
      heading: "Looking for a specific printing job?",
      body: "Some custom requirements aren't listed online yet — share yours and we'll check.",
      primary: SHARE_REQUIREMENT,
    },
  },
];

export function guidedAssistantMessageFor(pathname: string): GuidedAssistantMessage | null {
  const match = ROUTE_MESSAGES.find((entry) => entry.test(pathname));
  return match ? match.message : null;
}
