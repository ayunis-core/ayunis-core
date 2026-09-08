export interface PageMargins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * DIN 5008 letter margins in mm — the layout German official correspondence
 * is written to.
 *
 * `left` is the norm's 25mm alignment line (Fluchtlinie) and `top` is where
 * the address field starts: 45mm for Form B, whose taller letterhead leaves
 * room for a logo, and 27mm for Form A. PDF export reserves a further 53.5mm
 * for the address and contact block, so the body lands at the norm's 98.5mm
 * (Form B) or 80.5mm (Form A).
 *
 * These are starting points, not fixed truths — a letterhead's own artwork
 * decides where its zones really are, which is what the margin preview is for.
 */
export const DIN_5008_FORM_B_MARGINS: PageMargins = {
  top: 45,
  bottom: 20,
  left: 25,
  right: 20,
};

export const DIN_5008_FORM_A_MARGINS: PageMargins = {
  top: 27,
  bottom: 20,
  left: 25,
  right: 20,
};

/** Following pages carry no address field, so the text starts near the top. */
export const DIN_5008_CONTINUATION_MARGINS: PageMargins = {
  top: 25,
  bottom: 20,
  left: 25,
  right: 20,
};

export const DEFAULT_MARGINS: PageMargins = DIN_5008_FORM_B_MARGINS;

export const DEFAULT_CONTINUATION_MARGINS: PageMargins =
  DIN_5008_CONTINUATION_MARGINS;
