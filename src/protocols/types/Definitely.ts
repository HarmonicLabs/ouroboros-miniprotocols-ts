
export type Definitely<T> = {
    [P in keyof T]-?: (
        T[P] extends ((infer Something) | undefined) ?
            Something :
            T[P]
    )
};

/*
interface Something {
    a: string;
    b: number | undefined;
    c?: boolean;
    d: boolean | never;
    f?: number | undefined;
}

// type DefinitelySomething = {
//     a: string;
//     b: number;
//     c: boolean;
//     d: boolean | never;
//     f: number;
// }
type DefinitelySomething = Definitely<Something>;
*/