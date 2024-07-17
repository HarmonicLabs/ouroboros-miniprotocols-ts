export function isWord32( n: number | bigint ): boolean {
    if( typeof n === "bigint" ) {
        return( n >= 0 && n <= 4294967295 );
    }

    return( Number.isSafeInteger( n ) && ( n >= 0 && n <= 4294967295 ) );
}