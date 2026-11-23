/* Interface font choices.
   The original ten options (system + nine bundled Bangla/Latin faces) stay as
   the "Font" / Bangla picker. v3.0.1 adds five English fonts (a separate
   picker, default system so existing users see no change) and five new
   Bangla faces, all bundled offline (v3.0.2: Bornomala replaces Lohit Bengali). English text uses the English font;
   Bengali glyphs fall through to the Bangla font via the font stack. */

export const SYSTEM_STACK = '"Segoe UI Variable", "Segoe UI", "Nirmala UI", "Amiri", system-ui, sans-serif';
export const DEFAULT_UI_FONT = 'system';
export const DEFAULT_EN_FONT = 'system';

export const UI_FONTS = Object.freeze([
  { id: 'system',   family: null,                 en: 'System default (Segoe UI)', bn: 'সিস্টেম ডিফল্ট (Segoe UI)' },
  { id: 'hind',     family: 'Hind Siliguri',      en: 'Hind Siliguri · clean sans', bn: 'Hind Siliguri · পরিচ্ছন্ন সানস' },
  { id: 'notosans', family: 'Noto Sans Bengali',  en: 'Noto Sans Bengali · neutral', bn: 'Noto Sans Bengali · নিরপেক্ষ' },
  { id: 'notoserif', family: 'Noto Serif Bengali', en: 'Noto Serif Bengali · book serif', bn: 'Noto Serif Bengali · সেরিফ' },
  { id: 'anek',     family: 'Anek Bangla',        en: 'Anek Bangla · modern', bn: 'Anek Bangla · আধুনিক' },
  { id: 'baloo',    family: 'Baloo Da 2',         en: 'Baloo Da 2 · rounded', bn: 'Baloo Da 2 · গোলাকার' },
  { id: 'tiro',     family: 'Tiro Bangla',        en: 'Tiro Bangla · editorial serif', bn: 'Tiro Bangla · সম্পাদকীয় সেরিফ' },
  { id: 'atma',     family: 'Atma',               en: 'Atma · friendly display', bn: 'Atma · বন্ধুসুলভ' },
  { id: 'mina',     family: 'Mina',               en: 'Mina · soft humanist', bn: 'Mina · কোমল' },
  { id: 'galada',   family: 'Galada',             en: 'Galada · script', bn: 'Galada · হস্তলিপি' },
  { id: 'kalpurush', family: 'Kalpurush',         en: 'Kalpurush · clear text', bn: 'কালপুরুষ · স্পষ্ট লেখা' },
  { id: 'siyam',    family: 'Siyam Rupali',       en: 'Siyam Rupali · newspaper', bn: 'সিয়াম রূপালী · সংবাদপত্র' },
  { id: 'solaiman', family: 'SolaimanLipi',       en: 'SolaimanLipi · familiar', bn: 'সোলাইমানলিপি · পরিচিত' },
  { id: 'bornomala', family: 'Bornomala',        en: 'Bornomala · book text', bn: 'বর্ণমালা · বইয়ের লেখা' },
  { id: 'adorsho',  family: 'AdorshoLipi',        en: 'AdorshoLipi · classic', bn: 'আদর্শলিপি · ক্লাসিক' }
]);

export const EN_FONTS = Object.freeze([
  { id: 'system', family: null,                 en: 'System default', bn: 'সিস্টেম ডিফল্ট' },
  { id: 'inter',  family: 'Inter',               en: 'Inter · clean sans', bn: 'Inter · পরিচ্ছন্ন সানস' },
  { id: 'manrope', family: 'Manrope',            en: 'Manrope · geometric', bn: 'Manrope · জ্যামিতিক' },
  { id: 'outfit', family: 'Outfit',              en: 'Outfit · modern', bn: 'Outfit · আধুনিক' },
  { id: 'jakarta', family: 'Plus Jakarta Sans',  en: 'Plus Jakarta Sans · soft', bn: 'Plus Jakarta Sans · কোমল' },
  { id: 'fraunces', family: 'Fraunces',          en: 'Fraunces · soft serif', bn: 'Fraunces · কোমল সেরিফ' }
]);

// v3.0.2: Bornomala (OFL 1.0, Codepotro) replaces its stand-in Lohit Bengali;
// a saved 'lohit' choice loads as Bornomala.
export function sanitizeUiFont(value) {
  if (value === 'lohit') return 'bornomala';
  return typeof value === 'string' && UI_FONTS.some(font => font.id === value) ? value : DEFAULT_UI_FONT;
}

export function sanitizeEnFont(value) {
  return typeof value === 'string' && EN_FONTS.some(font => font.id === value) ? value : DEFAULT_EN_FONT;
}

/** CSS font-family list for the Bangla / general picker. */
export function uiFontStack(id) {
  const font = UI_FONTS.find(item => item.id === sanitizeUiFont(id));
  return font.family ? `"${font.family}", ${SYSTEM_STACK}` : SYSTEM_STACK;
}

/** CSS font-family list for Latin text. */
export function enFontStack(id) {
  const font = EN_FONTS.find(item => item.id === sanitizeEnFont(id));
  return font.family ? `"${font.family}", ${SYSTEM_STACK}` : SYSTEM_STACK;
}

/** Combined stack: Latin face first (no Bengali glyphs), then the Bangla face. */
export function combinedFontStack(enId, uiId) {
  const latin = enFontStack(enId);
  const bangla = uiFontStack(uiId);
  if (sanitizeEnFont(enId) === 'system') return bangla;
  if (latin === bangla) return latin;
  const first = EN_FONTS.find(item => item.id === sanitizeEnFont(enId))?.family;
  return first ? `"${first}", ${bangla}` : bangla;
}

export function uiFontLabel(id, lang = 'en') {
  const font = UI_FONTS.find(item => item.id === id);
  return font ? (lang === 'bn' ? font.bn : font.en) : '';
}

export function enFontLabel(id, lang = 'en') {
  const font = EN_FONTS.find(item => item.id === id);
  return font ? (lang === 'bn' ? font.bn : font.en) : '';
}
