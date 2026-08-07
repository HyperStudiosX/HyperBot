import {
    Request,
    Response,
    NextFunction
} from "express";

export class ErrorHandlerMiddleware{

    public static handle(

        error:Error,

        request:Request,

        response:Response,

        next:NextFunction

    ):void{

        console.error(

            "[API ERROR]",

            error

        );

        const status=(

            error as Error&{

                status?:number;

            }

        ).status??500;

        response.status(

            status

        ).json({

            success:false,

            message:

                error.message||

                "An unexpected error occurred.",

            timestamp:

                Date.now()

        });

    }

    public static notFound(

        request:Request,

        response:Response

    ):void{

        response.status(

            404

        ).json({

            success:false,

            message:

                "Resource not found.",

            path:

                request.originalUrl,

            timestamp:

                Date.now()

        });

    }

}
