
export type AsOptions<T> = {
    [P in keyof T]?: boolean
};