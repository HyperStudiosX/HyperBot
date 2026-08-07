import {
    Request,
    Response,
    NextFunction
} from "express";

export class CORSMiddleware{

    public static handle(

        allowedOrigins:string[]=["*"]

    ){

        return(

            request:Request,

            response:Response,

            next:NextFunction

        ):void=>{

            const origin=

                request.headers.origin;

            if(

                allowedOrigins.includes(

                    "*"

                )

            ){

                response.setHeader(

                    "Access-Control-Allow-Origin",

                    "*"

                );

            }

            else if(

                origin&&

                allowedOrigins.includes(

                    origin

                )

            ){

                response.setHeader(

                    "Access-Control-Allow-Origin",

                    origin

                );

            }

            response.setHeader(

                "Access-Control-Allow-Methods",

                "GET,POST,PUT,PATCH,DELETE,OPTIONS"

            );

            response.setHeader(

                "Access-Control-Allow-Headers",

                "Content-Type, Authorization"

            );

            response.setHeader(

                "Access-Control-Allow-Credentials",

                "true"

            );

            if(

                request.method===

                "OPTIONS"

            ){

                response.sendStatus(

                    204

                );

                return;

            }

            next();

        };

    }

}
