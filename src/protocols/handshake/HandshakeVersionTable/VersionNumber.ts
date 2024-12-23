

export type VersionNumber = number;

export function VersionNumber( thing: any ): VersionNumber
{
    if( typeof thing === "bigint" ) return VersionNumber( Number( thing ) );
    
    if( !Number.isSafeInteger( thing ) || thing < 0 )
    return 0;

    return thing & 0x7fff;
}

export function toClientVersionNumber( thing: VersionNumber ): number
{
    return VersionNumber( thing ) | 0x8000;
}

export function adaptVersionNumberToMode( thing: VersionNumber, n2n: boolean ): number
{
    return n2n ? VersionNumber( thing ) : toClientVersionNumber( thing );
}

export function isVersionNumber( thing: any ): thing is VersionNumber
{ 
    if( typeof thing === "bigint" ) return isVersionNumber( Number( thing ) );
    return Number.isSafeInteger( thing ) && thing === (thing & 0x7fff);
}

export function isExtendedVersionNumber( thing: any ): thing is VersionNumber
{
    if( typeof thing === "bigint" ) return isExtendedVersionNumber( Number( thing ) );
    return Number.isSafeInteger( thing ) && thing === (thing & 0xffff);
}