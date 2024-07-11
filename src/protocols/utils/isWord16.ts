
export function isWord16( n: number | bigint ): boolean
{
    if( typeof n === "bigint" )
    {
        return n >= 0 && n <= 65535;
    }

    return Number.isSafeInteger( n ) && (
        n >= 0 && n <= 65535
    );
}