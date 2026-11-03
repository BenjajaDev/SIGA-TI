const CODE_PREFIX = 'SIGA-';
const CODE_DIGITS = 6;

export const formatTicketCode = (number: number): string =>
  `${CODE_PREFIX}${String(number).padStart(CODE_DIGITS, '0')}`;
