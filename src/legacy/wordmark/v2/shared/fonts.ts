import {loadFont} from '@remotion/fonts';
import archivo from '@fontsource-variable/archivo/files/archivo-latin-wght-normal.woff2';
import archivoWidth from '@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2';
import fraunces from '@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2';
import frauncesItalic from '@fontsource-variable/fraunces/files/fraunces-latin-wght-italic.woff2';
import inter from '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2';
import mono from '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2';

// Bundled variable fonts, so previews and exports look the same on every device.
const faces = [
  {family: 'Archivo Variable', url: archivo, weight: '100 900'},
  {family: 'Archivo Flex', url: archivoWidth, weight: '100 900', stretch: '62% 125%'},
  {family: 'Fraunces Variable', url: fraunces, weight: '100 900'},
  {family: 'Fraunces Variable', url: frauncesItalic, weight: '100 900', style: 'italic'},
  {family: 'Inter Variable', url: inter, weight: '100 900'},
  {family: 'JetBrains Mono Variable', url: mono, weight: '100 800'},
];

let loaded = false;
export function loadTemplateFonts() {
  if (loaded || typeof document === 'undefined') return;
  loaded = true;
  for (const face of faces) loadFont({...face, display: 'block'});
}

export const DISPLAY = '"Archivo Variable", "Arial Black", Arial, sans-serif';
export const FLEX_FONT = '"Archivo Flex", "Archivo Variable", "Arial Black", Arial, sans-serif';
export const SERIF_FONT = '"Fraunces Variable", "Iowan Old Style", Georgia, serif';
export const SANS_FONT = '"Inter Variable", Inter, "Helvetica Neue", Arial, sans-serif';
export const MONO_FONT = '"JetBrains Mono Variable", "SF Mono", ui-monospace, Menlo, monospace';
