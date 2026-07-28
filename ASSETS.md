# תמונות לייצוא מפיגמה

הקוד מוכן. כל התמונות בתיקייה `public/assets/` הן **חילוץ זמני** מצילום הרנדר של פיגמה —
הן ברזולוציה 1x ועם הווטרמארק של pngtree. צריך להחליף אותן בייצוא נקי.

## איך לייצא
בפיגמה: בוחרים את השכבה → לוח `Export` מימין למטה → `PNG`, `2x` → `Export`.
שומרים בשם המדויק מהטבלה לתוך `public/assets/`.

| שם הקובץ | שכבה בפיגמה | גודל בעיצוב (px) |
|---|---|---|
| `logo.png` | `Artboard 1 copy@2x 1` | 170 × 64 |
| `rocket.webp` | `pngtree-space-rocket-launch-png-image_14610177 1` | 554 × 698 (חתוך מראש) |
| `mars-dome.png` | `מראס שיעבוד 1` | 1067 × 577 |
| `planet-saturn.png` | `17ac2c68-efd2-44d1-a0f2-72f5e3367264 1` | 398 × 698 — נחתך בכוונה בקצה הימני |
| `planet-earth.png` | `72db65bc-bf7f-496b-94be-b4dd72a70b68 1` | 326 × 440 |
| `planet-teal.png` | `planet-uranus-starry-sky-solar-system-space…` | 352 × 414 |
| `starfield.png` | `sky-full-stars-astronomy-outdoors-nebula 1` | 2001 × 1122 |
| `astronaut-float.png` | `Asset 1@3x 1` | 990 × 1010 |
| `astronaut-moon.png` | `astronaut-with-spacesuit-practicing-snowboarding-moon 1` | 578 × 769 |
| `avatar-1.png` | `Ellipse 6` (כרטיס שמאלי — משקפי כוכבים) | 215 × 215 |
| `avatar-2.png` | `Ellipse 6` (כרטיס מרכזי — לב) | 242 × 242 |
| `avatar-3.png` | `Ellipse 6` (כרטיס ימני — משקפי "וואו") | 230 × 230 |

`avatar-2.png` ו-`logo.png` כבר ייצאו מפיגמה ישירות — אין צורך להחליף אותם.

## מה לא צריך לייצא
הרקעים (הזוהר הכתום והכחול, הפסים הרדיאליים) בנויים ב-CSS, לא תמונות — הם וקטורים
בפיגמה ולכן זו הדרך הנכונה. אותו דבר לגבי הלפטופים (מסגרת CSS עם חלון לתמונת הפרויקט),
הקווים המקווקווים והנקודות על מאדים, וכל האייקונים.

## הלפטופים
בכל אחד משלושת בלוקי הפורטפוליו יש `<div className="h-full w-full bg-white" />` בתוך
המסך — שם נכנסת תמונת הפרויקט:

```tsx
<img src="/assets/project-1.png" alt="שם הפרויקט" className="h-full w-full object-cover" />
```

גודל המסך בעיצוב: 915 × 576 (יחס 1.59:1). לייצוא ב-2x: 1830 × 1152.
