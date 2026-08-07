import {
    Request,
    Response,
    NextFunction
} from "express";

export class LoggingMiddleware{

    public static log(

        request:Request,

        response:Response,

        next:NextFunction

    ):void{

        const start=

            Date.now();

        response.on(

            "finish",

            ()=>{

                const duration=

                    Date.now()-

                    start;

                console.log(

                    `[${new Date().toISOString()}] `+
                    `${request.method} `+
                    `${request.originalUrl} `+
                    `${response.statusCode} `+
                    `(${duration}ms)`

                );

            }

        );

        next();

    }

    public static request(

        request:Request,

        response:Response,

        next:NextFunction

    ):void{

        console.debug({

            method:

                request.method,

            url:

                request.originalUrl,

            ip:

                request.ip,

            userAgent:

                request.headers[
                    "user-agent"
                ]

        });

        next();

    }

}
