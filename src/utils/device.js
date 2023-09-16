import { UAParser } from 'ua-parser-js';

export const getBrowserName = () => (new UAParser()).getBrowser().name || 'Unknown';
export const getOSName = () => (new UAParser()).getOS().name || 'Unknown';
