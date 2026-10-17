import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...rest }: P) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconSpeaker = (p: P) => (
  <Svg {...p}>
    <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor" stroke="none" />
    <path d="M15.5 9a4 4 0 0 1 0 6" />
    <path d="M18 6.5a7.5 7.5 0 0 1 0 11" />
  </Svg>
);
export const IconCheck = (p: P) => (
  <Svg {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);
export const IconX = (p: P) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);
export const IconArrowRight = (p: P) => (
  <Svg {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);
export const IconArrowLeft = (p: P) => (
  <Svg {...p}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Svg>
);
export const IconChevronDown = (p: P) => (
  <Svg {...p}>
    <path d="M6 9l6 6 6-6" />
  </Svg>
);
export const IconStar = ({ filled, ...p }: P & { filled?: boolean }) => (
  <Svg {...p}>
    <path
      d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"
      fill={filled ? "currentColor" : "none"}
    />
  </Svg>
);
export const IconTrain = (p: P) => (
  <Svg {...p}>
    <rect x="5" y="3.5" width="14" height="13" rx="3.5" />
    <path d="M5 10.5h14M9 20l-2 1.5M15 20l2 1.5M8.5 16.5 7 20h10l-1.5-3.5" />
    <circle cx="9" cy="13.5" r=".6" fill="currentColor" />
    <circle cx="15" cy="13.5" r=".6" fill="currentColor" />
  </Svg>
);
export const IconBook = (p: P) => (
  <Svg {...p}>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
    <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5" />
  </Svg>
);
export const IconRepeat = (p: P) => (
  <Svg {...p}>
    <path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5M20 4v4.5h-4.5" />
    <path d="M20 12a8 8 0 0 1-13.7 5.6L4 15.5M4 20v-4.5h4.5" />
  </Svg>
);
export const IconTurtle = (p: P) => (
  <Svg {...p}>
    <path d="M4 15.5c0-4 3.4-7 8-7s7 3 7 6v1H4z" />
    <path d="M19 13.5h1.5a1.5 1.5 0 0 0 0-3H19M7 15.5 6 18M16 15.5l1 2.5" />
  </Svg>
);
export const IconLightbulb = (p: P) => (
  <Svg {...p}>
    <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3z" />
  </Svg>
);
export const IconCloud = (p: P) => (
  <Svg {...p}>
    <path d="M7 18.5a4.5 4.5 0 0 1-.5-9 6 6 0 0 1 11.6 1.5A3.75 3.75 0 0 1 17.5 18.5z" />
  </Svg>
);
export const IconBridge = (p: P) => (
  <Svg {...p}>
    <path d="M2.5 16.5h19M4 16.5V20M20 16.5V20M3 12c3-4.5 15-4.5 18 0" />
    <path d="M7.5 9.6v6.9M12 8.5v8M16.5 9.6v6.9" />
  </Svg>
);
export const IconSearch = (p: P) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20 20l-4.2-4.2" />
  </Svg>
);
/** Turn the phone around: two arrows chasing each other. */
export const IconRotate = (p: P) => (
  <Svg {...p}>
    <path d="M4.5 9.5A8 8 0 0 1 18 6.5l1.5 1.5M19.5 3.5V8H15" />
    <path d="M19.5 14.5A8 8 0 0 1 6 17.5L4.5 16M4.5 20.5V16H9" />
  </Svg>
);
export const IconCloudCheck = (p: P) => (
  <Svg {...p}>
    <path d="M7 18.5a4.5 4.5 0 0 1-.5-9 6 6 0 0 1 11.6 1.5A3.75 3.75 0 0 1 17.5 18.5z" />
    <path d="M9.5 13.5l2 2 3.5-3.5" />
  </Svg>
);
export const IconCloudOff = (p: P) => (
  <Svg {...p}>
    <path d="M9.5 6.2A6 6 0 0 1 18.1 11a3.75 3.75 0 0 1 2.4 5.5M17 18.5H7a4.5 4.5 0 0 1-.9-8.9" />
    <path d="M3.5 3.5l17 17" />
  </Svg>
);
export const IconDevice = (p: P) => (
  <Svg {...p}>
    <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
    <path d="M10.5 18.5h3" />
  </Svg>
);
/** A short itinerary: stops down a line. */
export const IconList = (p: P) => (
  <Svg {...p}>
    <path d="M10 6.5h10M10 12h10M10 17.5h10" />
    <circle cx="5" cy="6.5" r="1.25" fill="currentColor" />
    <circle cx="5" cy="12" r="1.25" fill="currentColor" />
    <circle cx="5" cy="17.5" r="1.25" fill="currentColor" />
  </Svg>
);
export const IconDownload = (p: P) => (
  <Svg {...p}>
    <path d="M12 4v11" />
    <path d="M7.5 10.5 12 15l4.5-4.5" />
    <path d="M5 19.5h14" />
  </Svg>
);

export const IconPlus = (p: P) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
