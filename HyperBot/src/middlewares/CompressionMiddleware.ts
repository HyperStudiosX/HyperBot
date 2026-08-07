import {
    Request,
    Response,
    NextFunction
} from "express";

import compression from "compression";

export class CompressionMiddleware{

    public static handle(){

        return compression({

            level:6,

            threshold:1024,

            filter:(

                request:Request,

                response:Response

            )=>{

                if(

                    request.headers[
                        "x-no-compression"
                    ]

                ){

                    return false;

                }

                return compression.filter(

                    request,

                    response

                );

            }

        });

    }

    public static skip(

        request:Request,

        response:Response,

        next:NextFunction

    ):void{

        response.setHeader(

            "X-Compression",

            "Disabled"

        );

        next();

    }

}
