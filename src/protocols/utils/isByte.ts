export function isByte( n: number | bigint ): boolean {
    if( typeof n === "bigint" ) {
        return( n >= 0 && n <= 255 );
    }
    
    return( Number.isSafeInteger( n ) && ( n >= 0 && n <= 255 ) );
}