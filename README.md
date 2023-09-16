# Safe, not blockable and not detectable tdlib web app

This project is a Proof-of-concept of a tdlib web app, safe to use in totalitarian countries without a risk of exposing the fact of the usage of the app to the government-controlled internet providers.

## Demo

There is a [demo app](https://s3.amazonaws.com/tdlib.web.app/index.html).

## Development

Before starting the development, install packages using `yarn`.

Make sure you've specified the following environment variables (You can use the `.env.local` file to do this, you can obtain yours at https://my.telegram.org):

* `REACT_APP_TELEGRAM_API_ID`
* `REACT_APP_TELEGRAM_API_HASH`

To run the app locally, run `yarn start`.

## Deployment

To make sure the totalitarian government or internet provider couldn't track the fact of the usage of the web app by a user, we use one of the most widely used services - AWS S3 file storage with HTTPS, so the provider would think of regular file assets loading.

### How to deploy to AWS S3

Before deployment, you need to have a bucket or at least a folder in S3. Configure the bucket policy like that:

```json
{
  "Version":"2012-10-17",
  "Statement":[
    {
      "Sid":"AddPerm",
      "Effect":"Allow",
      "Principal": "*",
      "Action":["s3:GetObject"],
      "Resource":["arn:aws:s3:::BUCKET_NAME/FOLDER_IF_NEEDED/*"]
      }
  ]
}
```

Make sure you've specified the `S3_BUCKET`, `S3_KEY` and `S3_SECRET` environment variables (and optionally `S3_USE_REGION`, but note that no-region S3 URLs are available only for `us-east-1`), as well as the variables mentioned at the [Development](#development) section of this readme. You can use the `.env.production.local` file to do this.

Once everything is ready, just run `yarn deploy`. It would create an application build and deploy it to AWS S3.
