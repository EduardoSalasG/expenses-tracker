declare module 'geoip-lite' {
  export type Lookup = {
    range?: [number, number];
    country?: string;
    region?: string;
    eu?: string;
    timezone?: string;
    city?: string;
    ll?: [number, number];
    metro?: number;
    area?: number;
  } | null;

  const geoip: {
    lookup(ip: string): Lookup;
  };

  export default geoip;
}
