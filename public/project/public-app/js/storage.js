const GK = (n) => `cachimboz_${n}`;
const CK = (n) => `cachimboz_${n}`;

export function getCourseAccess() {
  const exp = localStorage.getItem(CK("access_exp"));
  return exp ? new Date(exp) : null;
}

export function getPremiumGlobal() {
  const exp = localStorage.getItem(GK("premium_exp"));
  return exp ? new Date(exp) : null;
}
export function hasAccess() {
  const p = getPremiumGlobal();
  if (p && p.getTime() >= Date.now()) return true;
  const c = getCourseAccess();
  if (c && c.getTime() >= Date.now()) return true;
  return false;
}
export function setPremiumGlobal({ email, plan, start, vencimiento }) {
  if (!vencimiento) return;
  localStorage.setItem(GK("premium_email"), email || "");
  localStorage.setItem(
    GK("premium_plan"),
    Array.isArray(plan) ? plan.join(",") : String(plan || ""),
  );
  localStorage.setItem(GK("premium_start"), start || "");
  localStorage.setItem(GK("premium_exp"), vencimiento);
}

export function getLastCourse() {
  const raw = localStorage.getItem("lastCourse");
  return raw ? JSON.parse(raw) : null;
}

export function saveLastCourseStorage(name, link) {
  localStorage.setItem("lastCourse", JSON.stringify({ name, link }));
}
