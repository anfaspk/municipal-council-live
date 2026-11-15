export const KIT = {
  title: 'عُدّة الشاشات الصغيرة',
  heading: 'انتخابات المجالس البلدية 2026',
  stamp: 'آخر تحديث 10:42',
  stale: 'الأرقام كما في الساعة 10:30',
  seg: 'طريقة العرض',
  list: 'قائمة',
  map: 'خريطة',
  listPane: 'المحافظات مرتبة حسب نسبة المشاركة.',
  mapPane: 'الخريطة تأتي في المرحلة الرابعة.',
  sumTurnout: 'نسبة المشاركة',
  sumTurnoutLine:
    'صوّت قرابة نصف الناخبين المسجلين حتى الآن، أعلى من الساعة نفسها في الدورة السابقة.',
  sumVoters: 'الناخبون المسجلون',
  sumVotersLine: 'لم يُرسل هذا الرقم بعد.',
  chart: 'رسم المشاركة بالساعة',
  row: 'المؤشرات',
  story: 'قصص المحافظات',
  split: 'المحافظات وتفاصيلها',
  pick: 'اختر محافظة لعرض تفاصيلها.',
  sheet: 'ورقة',
  sheetDetents: 'ورقة بدرجات',
  sheetBody: 'محتوى الورقة',
  share: 'مشاركة الرابط',
  shared: {
    shared: 'تمت المشاركة',
    copied: 'تم نسخ الرابط',
    shown: 'انسخ الرابط',
    cancelled: 'أُلغيت المشاركة',
  },
  live: 'رقم يتغير',
  update: 'تحديث',
  type: 'أحجام الخط',
  sample: 'صوّت 51,627 ناخبًا في مسقط',
  section: {
    seg: 'العرض المجزأ',
    summary: 'بطاقة الملخص',
    snap: 'صف البطاقات',
    story: 'مشغّل القصص',
    split: 'القائمة والتفاصيل',
    sheet: 'الأوراق',
    share: 'المشاركة',
    live: 'الأرقام الحية',
    type: 'الخط',
  },
} as const;

export const GOVS = [
  { id: 1, ar: 'مسقط', turnout: 52.31, voted: 51627 },
  { id: 2, ar: 'ظفار', turnout: 48.07, voted: 30411 },
  { id: 3, ar: 'مسندم', turnout: 61.9, voted: 6402 },
  { id: 4, ar: 'البريمي', turnout: 45.22, voted: 9310 },
  { id: 5, ar: 'الداخلية', turnout: 57.45, voted: 40122 },
  { id: 6, ar: 'شمال الباطنة', turnout: 49.98, voted: 61270 },
  { id: 7, ar: 'جنوب الباطنة', turnout: 53.6, voted: 42815 },
  { id: 8, ar: 'جنوب الشرقية', turnout: 47.11, voted: 27901 },
] as const;

export const KPIS = [
  { label: 'المصوّتون', value: '269,858' },
  { label: 'نسبة المشاركة', value: '50.42%' },
  { label: 'المسجلات', value: '252,104' },
  { label: 'الولايات', value: '63' },
  { label: 'المراكز', value: '118' },
] as const;

export const SIZES = [12, 13, 14, 16] as const;
export const WEIGHTS = [400, 500, 600, 700] as const;
