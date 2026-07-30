import moment from "moment";

declare module "moment" {
  interface Moment {
    iYear(): number;
    iMonth(): number;
    iDate(): number;
    iDayOfYear(): number;
    iWeek(): number;
    iWeekYear(): number;
    format(format?: string): string;
  }
}

declare module "moment-hijri" {
  export default moment;
}
