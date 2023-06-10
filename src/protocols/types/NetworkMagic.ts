
export type NetworkMagic = number;

export function isNetworkMagic( stuff: any ): stuff is NetworkMagic
{
    return (
        typeof stuff === "number" && !Number.isNaN( stuff ) &&
        Number.isSafeInteger( stuff ) &&
        stuff >= 0 &&
        stuff <= 0xffffffff
    );
}

export function forceNetworkMagic( stuff: number | bigint ): NetworkMagic
{
    return Number(
        // Bigint operations because bitwise with number coerce to signed int
        BigInt(
            Math.round( 
                Math.abs( 
                    Number( stuff )
                )
            )
        ) & BigInt( "0xffffffff") 
    ) as NetworkMagic;
}