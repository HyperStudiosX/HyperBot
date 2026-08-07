export interface Cache<K,V>{

    /* --------------------------------------------------------
     * Storage
     * -------------------------------------------------------- */

    set(

        key:K,

        value:V

    ):void;

    get(

        key:K

    ):V|undefined;

    has(

        key:K

    ):boolean;

    delete(

        key:K

    ):boolean;

    clear():void;

    /* --------------------------------------------------------
     * Information
     * -------------------------------------------------------- */

    keys():K[];

    values():V[];

    entries():[K,V][];

    size():number;

}
