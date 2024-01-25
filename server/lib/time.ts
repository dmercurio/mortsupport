const second = 1000;
const minute = 60 * second;
const hour = 60 * minute;
const day = 24 * hour;
const week = 7 * day;

type Duration = {
  weeks?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
};

export default class time {
  static milliseconds(duration: Duration) {
    const d = {...{weeks: 0, days: 0, hours: 0, minutes: 0, seconds: 0}, ...duration};
    return d.weeks * week + d.days * day + d.hours * hour + d.minutes * minute + d.seconds * second;
  }

  static seconds(duration: Duration) {
    return (time.milliseconds(duration) * second) / 1000;
  }
}
