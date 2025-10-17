export function FeeWithCommision(charge: number, percent: number = 10) {
  return Number(((charge * percent) / 100).toFixed(2));
}
