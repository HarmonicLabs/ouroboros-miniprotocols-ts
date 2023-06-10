
export enum N2NHandshakeVersion {
    v7 = 7,
    v8 = 8,
    v9 = 9,
    v10 = 10,
    v11 = 11,
    v12 = 12
}

Object.freeze( N2NHandshakeVersion );

export function isN2NVersionNumber( n: number | N2NHandshakeVersion ): n is N2NHandshakeVersion
{
    return isOldN2NVersionNumber( n ) || isUpTo12N2NVersionNumber( n );
}

export function canBeN2NVersionNumber( n: number | bigint ): boolean
{
    return canBeOldN2NVersionNumber( n ) || canBeUpTo12N2NVersionNumber( n );
}

export function forceN2NVersionNumber( n: number | bigint ): N2NHandshakeVersion
{
    return canBeOldN2NVersionNumber( n ) ? forceOldN2NVersionNumber( n ): forceUpTo12N2NVersionNumber( n );
}

export type OldN2NVersionNumber
    = 7 
    | 8 
    | 9 
    | 10 
    | N2NHandshakeVersion.v7 
    | N2NHandshakeVersion.v8 
    | N2NHandshakeVersion.v9 
    | N2NHandshakeVersion.v10;

export function isOldN2NVersionNumber( n: number | N2NHandshakeVersion ): n is OldN2NVersionNumber
{
    return (
        n === 7 ||
        n === 8 ||
        n === 9 ||
        n === 10
    )
}

export function canBeOldN2NVersionNumber( n : number | bigint | N2NHandshakeVersion ): boolean
{
    if(!(
        typeof n === "number" ||
        typeof n === "bigint"
    )) return false;

    return isOldN2NVersionNumber( Number( n ) );
}

export function forceOldN2NVersionNumber( n: number | bigint ): OldN2NVersionNumber
{
    if(!(
        typeof n === "number" ||
        typeof n === "bigint"
    )) throw new Error("can't derive 'OldVersionNumber'");

    n = Number( n );

    if(!isOldN2NVersionNumber(n)) throw new Error("invalid 'OldN2NVersionNumber':" + n);

    return n;
}

export type UpTo12N2NVersionNumber
    = 11
    | 12
    | N2NHandshakeVersion.v11
    | N2NHandshakeVersion.v12;

export function isUpTo12N2NVersionNumber( n: number | N2NHandshakeVersion ): n is UpTo12N2NVersionNumber
{
    return (
        n === 11 ||
        n === 12
    )
}

export function canBeUpTo12N2NVersionNumber( n : number | bigint | N2NHandshakeVersion ): boolean
{
    if(!(
        typeof n === "number" ||
        typeof n === "bigint"
    )) return false;

    return isUpTo12N2NVersionNumber( Number( n ) );
}

export function forceUpTo12N2NVersionNumber( n: number | bigint ): UpTo12N2NVersionNumber
{
    if(!(
        typeof n === "number" ||
        typeof n === "bigint"
    )) throw new Error("can't derive 'OldVersionNumber'");

    n = Number( n );

    if(!isUpTo12N2NVersionNumber(n)) throw new Error("invalid 'UpTo12N2NVersionNumber':" + n);

    return n;
}

export type N2NVersionNumber = OldN2NVersionNumber | UpTo12N2NVersionNumber;