export function bool( stuff: any, defaultValue: boolean = false ): boolean
{
    return typeof stuff === 'boolean' ? stuff : Boolean(
        typeof stuff === 'undefined' ? defaultValue : stuff
    );
}

export function isMaybeBool( stuff: any ): stuff is boolean | undefined
{
    return typeof stuff === 'undefined' || typeof stuff === 'boolean';
}