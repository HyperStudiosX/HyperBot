import {
    Request,
    Response,
    NextFunction
} from "express";

export class ValidationMiddleware{

    public static requireFields(

        ...fields:string[]

    ){

        return(

            request:Request,

            response:Response,

            next:NextFunction

        ):void=>{

            const missing=

                fields.filter(

                    field=>

                        request.body[

                            field

                        ]===undefined||

                        request.body[

                            field

                        ]===null

                );

            if(

                missing.length>0

            ){

                response.status(

                    400

                ).json({

                    success:false,

                    message:

                        "Validation failed.",

                    missingFields:

                        missing

                });

                return;

            }

            next();

        };

    }

    public static validateContentType(

        contentType:string

    ){

        return(

            request:Request,

            response:Response,

            next:NextFunction

        ):void=>{

            if(

                !request.is(

                    contentType

                )

            ){

                response.status(

                    415

                ).json({

                    success:false,

                    message:

                        `Content-Type must be ${contentType}.`

                });

                return;

            }

            next();

        };

    }

}
