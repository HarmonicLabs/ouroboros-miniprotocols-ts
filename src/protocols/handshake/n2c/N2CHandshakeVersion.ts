export enum N2CHandshakeVersion {
    v9  = 32777,
    v10 = 32778,
    v11 = 32779,
    v12 = 32780,
    v13 = 32781,
    v14 = 32782,
    v15 = 32783,
    v16 = 32784,
}

Object.freeze( N2CHandshakeVersion );

export function isN2CVersionNumber( n: number | N2CHandshakeVersion ): n is N2CHandshakeVersion
{
    return isOldN2CVersionNumber( n ) || isUpTo16N2CVersionNumber( n );
}

export function canBeN2CVersionNumber( n: number | bigint ): boolean
{
    return canBeOldN2CVersionNumber( n ) || canBeUpTo16N2CVersionNumber( n );
}

export function forceN2CVersionNumber( n: number | bigint ): N2CHandshakeVersion
{
    return canBeOldN2CVersionNumber( n ) ? forceOldN2CVersionNumber( n ) : forceUpTo16N2CVersionNumber( n ); 
}

export type OldN2CVersionNumber
    = N2CHandshakeVersion.v9
    | N2CHandshakeVersion.v10
    | N2CHandshakeVersion.v11
    | N2CHandshakeVersion.v12
    | N2CHandshakeVersion.v13
    | N2CHandshakeVersion.v14;

export function isOldN2CVersionNumber( n: number | N2CHandshakeVersion ): n is OldN2CVersionNumber
{
    return (
        n === N2CHandshakeVersion.v9    ||
        n === N2CHandshakeVersion.v10   ||
        n === N2CHandshakeVersion.v11   ||
        n === N2CHandshakeVersion.v12   ||
        n === N2CHandshakeVersion.v13   ||
        n === N2CHandshakeVersion.v14
    )
}

export function canBeOldN2CVersionNumber( n : number | bigint ): boolean
{
    if(!(
        typeof n === "number" ||
        typeof n === "bigint"
    )) return false;

    return isOldN2CVersionNumber( Number( n ) );
}

export function forceOldN2CVersionNumber( n: number | bigint ): OldN2CVersionNumber
{
    if(!(
        typeof n === "number" ||
        typeof n === "bigint"
    )) throw new Error("can't derive 'OldVersionNumber'");

    n = Number( n );

    if(!isOldN2CVersionNumber(n)) throw new Error("invalid 'OldN2CVersionNumber':" + n);

    return n;
}

export type UpTo16N2CVersionNumber
    = N2CHandshakeVersion.v15
    | N2CHandshakeVersion.v16;

export function isUpTo16N2CVersionNumber( n: number ): n is UpTo16N2CVersionNumber
{
    return (
        n === N2CHandshakeVersion.v15 ||
        n === N2CHandshakeVersion.v16
    )
}

export function canBeUpTo16N2CVersionNumber( n : number | bigint ): boolean
{
    if(!(
        typeof n === "number" ||
        typeof n === "bigint"
    )) return false;

    return isUpTo16N2CVersionNumber( Number( n ) );
}

export function forceUpTo16N2CVersionNumber( n: number | bigint ): UpTo16N2CVersionNumber
{
    if(!(
        typeof n === "number" ||
        typeof n === "bigint"
    )) throw new Error("can't derive 'OldVersionNumber'");

    n = Number( n );

    if(!isUpTo16N2CVersionNumber(n)) throw new Error("invalid 'UpTo16N2CVersionNumber':" + n);

    return n;
}
