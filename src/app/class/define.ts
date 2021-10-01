import { read } from 'fs';
import { EventSystem } from './core/system';

export class Define {
    static readonly COOKIE_EXPIRES_MONTH: number = 3; // 3ヶ月クッキーを保持
    static EXPIRE(): Date {
        let date = new Date();
        date.setMonth(date.getMonth() + this.COOKIE_EXPIRES_MONTH);
        return date;
    }
    static readonly UDONARIUM_LILY_GK_VERSION: string = '1.04.0.gk0.7.22';
}
