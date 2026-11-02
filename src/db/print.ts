// Print helpers.
//
// Two paper widths are supported from the same markup:
//   • A4 (default)      — the invoice and report letterheads.
//   • 80mm thermal roll — the customer receipt, laid out by `html[data-print="thermal"]`
//                         rules in index.css.
//
// The mode is a flag on <html> rather than a prop because @media print rules
// can't see React state. It has to be removed again afterwards or the next
// ordinary Ctrl+P would come out at receipt width.

/** Prints the current page as an 80mm thermal receipt. */
export function printThermal(): void {
  const root = document.documentElement;
  root.setAttribute("data-print", "thermal");
  // `afterprint` is not reliable in every browser, so clear on a timer as well.
  // Removing the attribute is what restores A4 for the next print.
  const clear = () => {
    root.removeAttribute("data-print");
    window.removeEventListener("afterprint", clear);
  };
  window.addEventListener("afterprint", clear);
  window.print();
  window.setTimeout(clear, 1000);
}

/** Prints the current page at A4 (the default layout). */
export function printA4(): void {
  document.documentElement.removeAttribute("data-print");
  window.print();
}
