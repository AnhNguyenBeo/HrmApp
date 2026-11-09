const defaultNumbers = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

function readTriple(triple: number, showZeroHundred: boolean): string {
  const a = Math.floor(triple / 100);
  const b = Math.floor((triple % 100) / 10);
  const c = triple % 10;

  if (a === 0 && b === 0 && c === 0) return '';

  let result = '';

  if (a > 0 || showZeroHundred) {
    result += defaultNumbers[a] + ' trăm ';
  }

  if (b === 0 && c > 0) {
    if (a > 0 || showZeroHundred) result += 'lẻ ';
    result += defaultNumbers[c];
  } else if (b === 1) {
    result += 'mười ';
    if (c === 1) result += 'một';
    else if (c === 5) result += 'lăm';
    else if (c > 0) result += defaultNumbers[c];
  } else if (b > 1) {
    result += defaultNumbers[b] + ' mươi ';
    if (c === 1) result += 'mốt';
    else if (c === 5) result += 'lăm';
    else if (c > 0) result += defaultNumbers[c];
  }

  return result.trim();
}

export function numberToVietnameseWords(amount: number): string {
  if (!amount || isNaN(amount) || amount === 0) return 'Không đồng chẵn';

  const isNegative = amount < 0;
  let abs = Math.abs(Math.round(amount));

  const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  const groups: number[] = [];

  while (abs > 0) {
    groups.push(abs % 1000);
    abs = Math.floor(abs / 1000);
  }

  let words = '';
  for (let i = groups.length - 1; i >= 0; i--) {
    const groupVal = groups[i];
    if (groupVal > 0) {
      const showHundred = i < groups.length - 1;
      const groupText = readTriple(groupVal, showHundred);
      words += `${groupText} ${units[i]} `;
    }
  }

  words = words.trim().replace(/\s+/g, ' ');
  if (!words) return 'Không đồng';

  const capitalized = words.charAt(0).toUpperCase() + words.slice(1);
  return `${isNegative ? 'Âm ' : ''}${capitalized} đồng chẵn.`;
}
