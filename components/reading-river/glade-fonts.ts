import { Spectral } from "next/font/google";

/**
 * Spectral, a screen-first serif drawn after Garamond and Fournier: its
 * italic has the warmth of old book type, so the titles sit naturally in
 * the painting while staying easy to read on the water.
 */
const spectral = Spectral({ weight: ["400", "500"], style: ["normal", "italic"], subsets: ["latin"], variable: "--font-spectral", display: "swap" });

export const gladeFontVariables = spectral.variable;
