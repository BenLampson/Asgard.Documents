/** Shared brand lockup, reconstructed from the maintainer's supplied screenshot; original SVG was not available. */
export function Brand() {
  return (
    <span className="brand-lockup">
      {/* The adjacent wordmark supplies the accessible name. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="brand-mark"
        src="/asgard-mark.svg"
        width="32"
        height="32"
        alt=""
      />
      <strong>Asgard</strong>
    </span>
  );
}
