export function getCborBytesDescriptor():
{
    get: () => (Uint8Array | undefined),
    set: ( b: Uint8Array | undefined ) => Uint8Array | undefined,
    enumerable: true,
    configurable: false 
}
{
    let _cborBytes: Uint8Array | undefined = undefined
    return {
        get: () => _cborBytes,
        set: ( b: Uint8Array | undefined ) => {
            if(
                b === undefined ||
                b instanceof Uint8Array
            )
            {
                _cborBytes = b;
                return b;
            }
        },
        enumerable: true,
        configurable: false
    }
}