import { format, isValid, parse } from 'date-fns';

export class DateUtils {
  static formatDateOnly(date: Date): string {
    return format(date, 'yyyy-MM-dd');
  }

  static normalizeDateOnly(input: string): string | null {
    const parsed = this.parseWithFormatStrict(input, 'yyyy-MM-dd');
    if (!parsed) {
      return null;
    }

    return format(parsed, 'yyyy-MM-dd');
  }

  static toDateOnly(input: string): Date | null {
    const parsed = this.parseWithFormatStrict(input, 'yyyy-MM-dd');
    if (!parsed) {
      return null;
    }

    parsed.setHours(0, 0, 0, 0);
    return parsed;
  }

  static getTodayDateOnly(): string {
    return format(new Date(), 'yyyy-MM-dd');
  }

  static parseDateWithFormatsToUtcStart(
    input: string,
    formats: string[],
  ): Date | null {
    for (const currentFormat of formats) {
      const parsed = this.parseWithFormatStrict(input, currentFormat);
      if (parsed) {
        return this.toUtcDateStart(parsed);
      }
    }

    return null;
  }

  static toUtcDateStart(date: Date): Date {
    return new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
    );
  }

  private static parseWithFormatStrict(
    input: string,
    dateFormat: string,
  ): Date | null {
    const normalizedInput = input.trim();
    const parsed = parse(normalizedInput, dateFormat, new Date());

    if (!isValid(parsed)) {
      return null;
    }

    if (format(parsed, dateFormat) !== normalizedInput) {
      return null;
    }

    return parsed;
  }
}
