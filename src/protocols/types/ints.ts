
export function canBeInteger( stuff: any ): stuff is (number | bigint)
{
    return ( typeof stuff == "number" || typeof stuff === "bigint" );
}

export function forceInteger( stuff: number | bigint ): number
{
    return Math.round( Number( stuff ) );
}

export function canBeUInteger( stuff: any ): stuff is (number | bigint)
{
    return canBeInteger( stuff ) && stuff >= 0;
}

export function isInteger( stuff: number | bigint ): boolean
{
    return Number.isSafeInteger( stuff ) || typeof stuff === "bigint";
}

export function isUInteger( stuff: number | bigint ): boolean
{
    return isInteger( stuff ) && stuff >= 0;
}

export function forceUInteger( stuff: number | bigint ): number
{
    return Math.round( Math.abs( Number( stuff ) ) );
}

export function forceBigUInt( stuff: number | bigint ): bigint
{
    if( typeof stuff === "number" ) return BigInt( forceUInteger( stuff ) );
    return stuff < 0 ? -stuff : stuff;
}