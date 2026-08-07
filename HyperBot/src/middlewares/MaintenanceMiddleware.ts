import {
    Request,
    Response,
    NextFunction
} from "express";

export class MaintenanceMiddleware{

    private static enabled=false;

    public static enable():void{

        this.enabled=true;

    }

    public static disable():void{

        this.enabled=false;

    }

    public static isEnabled():boolean{

        return this.enabled;

    }

    public static handle(

        request:Request,

        response:Response,

        next:NextFunction

    ):void{

        if(

            !this.enabled

        ){

            next();

            return;

        }

        response.status(

            503

        ).json({

            success:false,

            message:

                "The service is currently under maintenance.",

            code:

                "MAINTENANCE_MODE",

            timestamp:

                Date.now()

        });

    }

}
