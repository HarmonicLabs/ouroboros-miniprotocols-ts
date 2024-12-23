
export type NetworkMagic = number;

export enum CardanoNetworkMagic {
    Preprod = 1,
    Preview = 2,
    Sanchonet = 4,
    Mainnet = 764824073
}

Object.freeze( CardanoNetworkMagic );

export function isNetworkMagic( stuff: any ): stuff is NetworkMagic
{
    return (
        Number.isSafeInteger( stuff ) &&
        // unsigned integer 32 bits
        stuff === (stuff >>> 0)
    );
}