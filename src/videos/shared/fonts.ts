import {loadFont} from '@remotion/fonts';
import archivo from '@fontsource-variable/archivo/files/archivo-latin-wght-normal.woff2';
import archivoExt from '@fontsource-variable/archivo/files/archivo-latin-ext-wght-normal.woff2';
import archivoVi from '@fontsource-variable/archivo/files/archivo-vietnamese-wght-normal.woff2';
import archivoWidth from '@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2';
import archivoWidthExt from '@fontsource-variable/archivo/files/archivo-latin-ext-wdth-normal.woff2';
import archivoWidthVi from '@fontsource-variable/archivo/files/archivo-vietnamese-wdth-normal.woff2';
import fraunces from '@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2';
import frauncesExt from '@fontsource-variable/fraunces/files/fraunces-latin-ext-wght-normal.woff2';
import frauncesVi from '@fontsource-variable/fraunces/files/fraunces-vietnamese-wght-normal.woff2';
import frauncesItalic from '@fontsource-variable/fraunces/files/fraunces-latin-wght-italic.woff2';
import frauncesItalicExt from '@fontsource-variable/fraunces/files/fraunces-latin-ext-wght-italic.woff2';
import frauncesItalicVi from '@fontsource-variable/fraunces/files/fraunces-vietnamese-wght-italic.woff2';
import inter from '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2';
import interExt from '@fontsource-variable/inter/files/inter-latin-ext-wght-normal.woff2';
import interVi from '@fontsource-variable/inter/files/inter-vietnamese-wght-normal.woff2';
import interCyr from '@fontsource-variable/inter/files/inter-cyrillic-wght-normal.woff2';
import interCyrExt from '@fontsource-variable/inter/files/inter-cyrillic-ext-wght-normal.woff2';
import mono from '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2';
import monoExt from '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-ext-wght-normal.woff2';
import monoVi from '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-vietnamese-wght-normal.woff2';
import monoCyr from '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-cyrillic-wght-normal.woff2';
import monoCyrExt from '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-cyrillic-ext-wght-normal.woff2';

const R_LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const R_LATIN_EXT = 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';
const R_VIETNAMESE = 'U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB';
const R_CYRILLIC = 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116';
const R_CYRILLIC_EXT = 'U+0460-052F,U+1C80-1C8A,U+20B4,U+2DE0-2DFF,U+A640-A69F,U+FE2E-FE2F';

// Bundled variable fonts with Latin, Latin-Extended, Vietnamese, and Cyrillic coverage,
// so previews and exports render diacritics and non-Latin scripts consistently on every device.
const faces = [
  {family: 'Archivo Variable', url: archivo, weight: '100 900', unicodeRange: R_LATIN},
  {family: 'Archivo Variable', url: archivoExt, weight: '100 900', unicodeRange: R_LATIN_EXT},
  {family: 'Archivo Variable', url: archivoVi, weight: '100 900', unicodeRange: R_VIETNAMESE},
  {family: 'Archivo Flex', url: archivoWidth, weight: '100 900', stretch: '62% 125%', unicodeRange: R_LATIN},
  {family: 'Archivo Flex', url: archivoWidthExt, weight: '100 900', stretch: '62% 125%', unicodeRange: R_LATIN_EXT},
  {family: 'Archivo Flex', url: archivoWidthVi, weight: '100 900', stretch: '62% 125%', unicodeRange: R_VIETNAMESE},
  {family: 'Fraunces Variable', url: fraunces, weight: '100 900', unicodeRange: R_LATIN},
  {family: 'Fraunces Variable', url: frauncesExt, weight: '100 900', unicodeRange: R_LATIN_EXT},
  {family: 'Fraunces Variable', url: frauncesVi, weight: '100 900', unicodeRange: R_VIETNAMESE},
  {family: 'Fraunces Variable', url: frauncesItalic, weight: '100 900', style: 'italic', unicodeRange: R_LATIN},
  {family: 'Fraunces Variable', url: frauncesItalicExt, weight: '100 900', style: 'italic', unicodeRange: R_LATIN_EXT},
  {family: 'Fraunces Variable', url: frauncesItalicVi, weight: '100 900', style: 'italic', unicodeRange: R_VIETNAMESE},
  {family: 'Inter Variable', url: inter, weight: '100 900', unicodeRange: R_LATIN},
  {family: 'Inter Variable', url: interExt, weight: '100 900', unicodeRange: R_LATIN_EXT},
  {family: 'Inter Variable', url: interVi, weight: '100 900', unicodeRange: R_VIETNAMESE},
  {family: 'Inter Variable', url: interCyr, weight: '100 900', unicodeRange: R_CYRILLIC},
  {family: 'Inter Variable', url: interCyrExt, weight: '100 900', unicodeRange: R_CYRILLIC_EXT},
  {family: 'JetBrains Mono Variable', url: mono, weight: '100 800', unicodeRange: R_LATIN},
  {family: 'JetBrains Mono Variable', url: monoExt, weight: '100 800', unicodeRange: R_LATIN_EXT},
  {family: 'JetBrains Mono Variable', url: monoVi, weight: '100 800', unicodeRange: R_VIETNAMESE},
  {family: 'JetBrains Mono Variable', url: monoCyr, weight: '100 800', unicodeRange: R_CYRILLIC},
  {family: 'JetBrains Mono Variable', url: monoCyrExt, weight: '100 800', unicodeRange: R_CYRILLIC_EXT},
];

let loaded = false;
export function loadTemplateFonts() {
  if (loaded || typeof document === 'undefined') return;
  loaded = true;
  for (const face of faces) loadFont({...face, display: 'block'});
}

export const DISPLAY = '"Archivo Variable", "Inter Variable", "Arial Black", Arial, sans-serif';
export const FLEX_FONT = '"Archivo Flex", "Archivo Variable", "Inter Variable", "Arial Black", Arial, sans-serif';
export const SERIF_FONT = '"Fraunces Variable", "Inter Variable", "Iowan Old Style", Georgia, serif';
export const SANS_FONT = '"Inter Variable", Inter, "Helvetica Neue", Arial, sans-serif';
export const MONO_FONT = '"JetBrains Mono Variable", "SF Mono", ui-monospace, Menlo, monospace';
