export function HandoffLogo({ size = 28 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 34 34"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      style={{ flexShrink: 0 }}
    >
      <rect width="34" height="34" rx="9" fill="#2563eb" />
      <path d="M6.5 21.5 C8 17 10.5 15 13 17.5 C14.8 19.3 15.8 21.5 18 20 C20.2 18.5 22 16.5 25 17.5 C26.5 18 27.5 19 27.5 19" stroke="white" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 25 C8.5 20 11.5 18.5 14 21 C15.5 22.5 16.5 24.5 19 23 C21.5 21.5 23.5 19.5 26.5 20.5" stroke="white" strokeWidth="1.6" fill="none" strokeOpacity="0.55" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 13 C11 11 13 10.5 15 12 C16 12.8 16.5 14 18 13.5 C19.5 13 21 11.5 23 12.5" stroke="white" strokeWidth="1.4" fill="none" strokeOpacity="0.35" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
