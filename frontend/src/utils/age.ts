export function ageAtEvent(dob: Date, eventStart: Date): number {
  let age = eventStart.getFullYear() - dob.getFullYear();
  const m = eventStart.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && eventStart.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}
