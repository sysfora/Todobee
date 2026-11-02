/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": null,
    "deleteRule": null,
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text1579384326",
        "max": 200,
        "min": 0,
        "name": "name",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "cascadeDelete": false,
        "collectionId": "_pb_users_auth_",
        "hidden": false,
        "id": "relation3479234172",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "owner",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "hidden": false,
        "id": "select3713686397",
        "maxSelect": 1,
        "name": "plan",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": [
          "premium",
          "pro",
          "enterprise"
        ]
      },
      {
        "hidden": false,
        "id": "number3219281744",
        "max": null,
        "min": 0,
        "name": "seats",
        "onlyInt": false,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "date2952721358",
        "max": "",
        "min": "",
        "name": "subscribedAt",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "date"
      },
      {
        "hidden": false,
        "id": "date799029660",
        "max": "",
        "min": "",
        "name": "renewsAt",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "date"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text1278432162",
        "max": 200,
        "min": 0,
        "name": "stripeCustomerId",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text1484822388",
        "max": 200,
        "min": 0,
        "name": "stripeSubscriptionId",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text2115269472",
        "max": 200,
        "min": 0,
        "name": "driveFolderId",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text602677609",
        "max": 200,
        "min": 0,
        "name": "driveFileId",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "json1095199719",
        "maxSize": 8000000,
        "name": "cache",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      },
      {
        "hidden": false,
        "id": "bool2275605076",
        "name": "driveSynced",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "bool"
      },
      {
        "hidden": false,
        "id": "select2063623452",
        "maxSelect": 1,
        "name": "status",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": [
          "inactive",
          "active",
          "past_due",
          "canceled"
        ]
      }
    ],
    "id": "pbc_2170078043",
    "indexes": [],
    "listRule": null,
    "name": "workspaces",
    "system": false,
    "type": "base",
    "updateRule": null,
    "viewRule": null
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2170078043");

  return app.delete(collection);
})
