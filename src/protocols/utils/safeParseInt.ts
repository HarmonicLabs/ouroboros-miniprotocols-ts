export function safeParseInt( stuff: any ): number | undefined
{
    try {
        return parseInt( stuff );
    } catch { return undefined; }
}