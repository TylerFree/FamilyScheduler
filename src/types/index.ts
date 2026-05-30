import type { Frequency } from "rrule";

export type HexColor = `#${string}`;
export type IsoDateString = `${number}-${number}-${number}`;
export type IsoDateTimeString = string;

export const CALENDAR_VIEWS = ["day", "week", "month"] as const;
export type CalendarView = (typeof CALENDAR_VIEWS)[number];

export const MEMBER_DEFAULT_VIEWS = ["day", "week"] as const;
export type MemberDefaultView = (typeof MEMBER_DEFAULT_VIEWS)[number];

export const MEMBER_ROLES = ["parent", "child"] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

export const MEMBER_PERMISSIONS = ["owner", "editor", "view", "none"] as const;
export type MemberPermission = (typeof MEMBER_PERMISSIONS)[number];

export const TIME_FORMATS = ["12h", "24h"] as const;
export type TimeFormat = (typeof TIME_FORMATS)[number];

export const WEEK_STARTS_ON_VALUES = [0, 1] as const;
export type WeekStartsOn = (typeof WEEK_STARTS_ON_VALUES)[number];

export const FAMILY_MEMBER_IDS = [
  "tyler",
  "heather",
  "erin",
  "leo",
  "anthony",
  "savannah",
  "lily",
] as const;
export type MemberId = (typeof FAMILY_MEMBER_IDS)[number];

export const FAMILY_MEMBER_DIRECTORY = {
  tyler: {
    id: "tyler",
    name: "Tyler",
    color: "#c2410c",
    role: "parent",
    permission: "owner",
  },
  heather: {
    id: "heather",
    name: "Heather",
    color: "#7c2d6f",
    role: "parent",
    permission: "editor",
  },
  erin: {
    id: "erin",
    name: "Erin",
    color: "#1e5f74",
    role: "child",
    permission: "view",
  },
  leo: {
    id: "leo",
    name: "Leo",
    color: "#b4632f",
    role: "child",
    permission: "view",
  },
  anthony: {
    id: "anthony",
    name: "Anthony",
    color: "#4a6b3a",
    role: "child",
    permission: "none",
  },
  savannah: {
    id: "savannah",
    name: "Savannah",
    color: "#8a4c8a",
    role: "child",
    permission: "none",
  },
  lily: {
    id: "lily",
    name: "Lily",
    color: "#a8651c",
    role: "child",
    permission: "none",
  },
} as const satisfies Record<
  MemberId,
  {
    id: MemberId;
    name: string;
    color: HexColor;
    role: MemberRole;
    permission: MemberPermission;
  }
>;

export const RECURRENCE_FREQUENCIES = [
  "YEARLY",
  "MONTHLY",
  "WEEKLY",
  "DAILY",
  "HOURLY",
  "MINUTELY",
  "SECONDLY",
] as const;
export type RecurrenceFrequencyName = (typeof RECURRENCE_FREQUENCIES)[number];
export type RRuleFrequency = Frequency;

export const RECURRENCE_WEEKDAYS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] as const;
export type RecurrenceWeekday = (typeof RECURRENCE_WEEKDAYS)[number];
export type RecurrenceByDay = RecurrenceWeekday | `${number}${RecurrenceWeekday}`;

export type RecurrenceRule = {
  freq: RecurrenceFrequencyName;
  interval?: number;
  count?: number;
  until?: IsoDateTimeString;
  dtstart?: IsoDateTimeString;
  wkst?: RecurrenceWeekday;
  tzid?: string;
  bysetpos?: number | number[];
  bymonth?: number | number[];
  bymonthday?: number | number[];
  byyearday?: number | number[];
  byweekno?: number | number[];
  byDay?: RecurrenceByDay | RecurrenceByDay[];
  byhour?: number | number[];
  byminute?: number | number[];
  bysecond?: number | number[];
};

export type HouseholdPreferences = {
  defaultView: CalendarView;
  weekStartsOn: WeekStartsOn;
  visibleHoursStart: number;
  visibleHoursEnd: number;
  timeFormat: TimeFormat;
  showWeather: boolean;
};

export type Event = {
  id: string;
  title: string;
  /** Minutes from midnight in the household's local timezone. */
  startMinutes: number;
  endMinutes: number;
  date: IsoDateString;
  isAllDay: boolean;
  location?: string;
  notes?: string;
  /** Member ID whose color drives the event chip stripe (`--c`). */
  ownerId: MemberId;
  attendeeIds: MemberId[];
  /** Subset of attendeeIds marked as transportation rather than full attendance. */
  drivers: MemberId[];
  recurrence?: RecurrenceRule;
  createdAt: IsoDateTimeString;
  createdBy: string;
  updatedAt: IsoDateTimeString;
};

export type Member = {
  id: MemberId;
  name: string;
  color: HexColor;
  role: MemberRole;
  permission: MemberPermission;
  defaultView: MemberDefaultView;
  meta?: string;
  order: number;
};

export const FAMILY_MEMBERS: Member[] = [
  {
    ...FAMILY_MEMBER_DIRECTORY.tyler,
    defaultView: "day",
    meta: "Parent · Household owner",
    order: 0,
  },
  {
    ...FAMILY_MEMBER_DIRECTORY.heather,
    defaultView: "day",
    meta: "Parent · Family editor",
    order: 1,
  },
  {
    ...FAMILY_MEMBER_DIRECTORY.erin,
    defaultView: "day",
    meta: "Child · Family calendar",
    order: 2,
  },
  {
    ...FAMILY_MEMBER_DIRECTORY.leo,
    defaultView: "day",
    meta: "Child · Family calendar",
    order: 3,
  },
  {
    ...FAMILY_MEMBER_DIRECTORY.anthony,
    defaultView: "day",
    meta: "Child · Attendee only",
    order: 4,
  },
  {
    ...FAMILY_MEMBER_DIRECTORY.savannah,
    defaultView: "day",
    meta: "Child · Attendee only",
    order: 5,
  },
  {
    ...FAMILY_MEMBER_DIRECTORY.lily,
    defaultView: "day",
    meta: "Child · Attendee only",
    order: 6,
  },
];

export type Household = {
  id: string;
  name: string;
  location: string;
  members: Member[];
  preferences: HouseholdPreferences;
};

export type EventTimeGridVars = {
  "--start": number;
  "--dur": number;
};

export type LaneAssignment = {
  lane: number;
  lanes: number;
  groupId: string;
  "--lane": number;
  "--lanes": number;
};

export type EventWithLane = Event &
  EventTimeGridVars &
  LaneAssignment & {
    durationMinutes: number;
  };

export type LaneComputationInput = Pick<
  Event,
  "id" | "date" | "startMinutes" | "endMinutes"
>;

export type LaneGroup = {
  id: string;
  date: Event["date"];
  startMinutes: number;
  endMinutes: number;
  laneCount: number;
  events: EventWithLane[];
};
