export interface Timecode {
    _id: string;
    timeStart: number;
    timeEnd: number;
    title: string;
    text: string;
}

export interface Markup {
    _id?: string;
    title: string;
    videoPath: string;
    timecodes: Timecode[];
    createdAt?: string;
}
