import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CollectionAddress } from "src/delivery/entities/collection_Address.entity";
import { DeliveryAddress } from "src/delivery/entities/delivery_information.entity";
import { Product } from "src/products/entities/products.entity";
import { InjectLogger } from "src/shared/decorators/logger.decorator";
import { Logger } from "winston";

@Injectable()
export class SendcloudService {
  public panelUrl;
  servicePointUrl;
  publicKey;
  privateKey;
  auth;
  constructor(
    private readonly _configService: ConfigService,

    @InjectLogger() private readonly _logger: Logger
  ) {
    this.panelUrl = this._configService.get("SENDCLOUD_BASE_PANEL_URL");
    this.privateKey = this._configService.get("SENDCLOUD_SECRET_KEY");
    this.publicKey = this._configService.get("SENDCLOUD_PUBLIC_KEY");
    this.auth = Buffer.from(`${this.publicKey}:${this.privateKey}`).toString("base64");
  }
  async getShippingMethods(address: {
    from: { country: string; postal_code: string };
    to: { country: string; postal_code: string };
    product?: Product;
    service_point_id?: number | null;
  }) {
    let url = `${this.panelUrl}/shipping_methods?to_country=${address.to.country}&to_postal_code=${address.to.postal_code}&from_postal_code=${address.from.postal_code}&from_country=${address.from.country}&limit=50`;

    if (address.service_point_id) {
      url = `${this.panelUrl}/shipping_methods?service_point_id=${address.service_point_id}`;
    }
    console.log(url);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Basic ${this.auth}`,
        "Content-Type": "application/json",
      },
    });
    // console.log(response);
    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(`SendCloud API Error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  async getSpecificShippingMethods(shippingId: number) {
    const url = `${this.panelUrl}/shipping_methods/${shippingId}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Basic ${this.auth}`,
        "Content-Type": "application/json",
      },
    });
    // console.log(response);
    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(`SendCloud API Error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  async getEstimateOfSingleShipping(
    address: {
      from?: { country: string; postal_code: string };
      to?: { country: string; postal_code: string };
      product: Product;
    },
    shippingId: number
  ) {
    const url = `${this.panelUrl}/shipping-price?shipping_method_id=${shippingId}&to_country=${address.to.country}&from_country=${address.from.country}&weight=${address.product.weight}&weight_unit=kilogram`;
    // console.log(url);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Basic ${this.auth}`,
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(`SendCloud API Error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  async getServicePoints(address: {
    from: { country: string; postal_code: string };
    to: { country: string; postal_code: string };
    product?: Product;
  }) {
    const url = `${this.panelUrl}/service-points?to_country=${address.to.country}&to_postal_code=${address.to.postal_code}&from_postal_code=${address.from.postal_code}&from_country=${address.from.country}&limit=50`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Basic ${this.auth}`,
        "Content-Type": "application/json",
      },
    });
    // console.log(response);
    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(`SendCloud API Error (${response.status}): ${errorText}`);
    }

    return response.json();
  }
  buildParcelItemsFromProduct(product: Product) {
    return [
      {
        description: product.product_name,
        quantity: product.quantity ?? 1,
        weight: product.weight ?? 0.5, // fallback
        value: product.selling_price,
        product_id: product.id.toString(),
        sku: `${product.brand}-${product.id}`,
        hs_code: "000000", // optional → replace if you add HS
        origin_country: product.collectionAddress.country, // optional → replace if needed
        properties: {
          brand: product.brand,
          condition: product.condition,
          size: product.size,
          category: product.category,
        },
      },
    ];
  }

  async createParcelIntoSendCloud(data: {
    from: CollectionAddress;
    to: DeliveryAddress;
    product: Product;
    shippingMethodId: number;
  }) {
    // const auth = Buffer.from(`${publicKey}:${secretKey}`).toString("base64");

    console.log("Panel url");
    const parcelItems = this.buildParcelItemsFromProduct(data.product);

    // if(data.product.carrer_option)
    console.log(data.product.carrer_option);
    // if
    let payload: any = {
      parcel: {
        // ✅ Delivery address
        name: data.to.name,
        company_name: data.to.company_name,
        email: data.to.email,
        telephone: data.to.telephone,
        address: data.to.address,
        house_number: data.to.house_number,
        address_2: data.to.address_2 || "",
        city: data.to.city,
        country: data.to.country,
        postal_code: data.to.postal_code,

        // ✅ Sender address
        from_name: data.from.name,
        from_company_name: data.from.company_name,
        from_address_1: data.from.address,
        from_address_2: data.from.address_2 || "",
        from_house_number: data.from.house_number,
        from_city: data.from.city,
        from_postal_code: data.from.postal_code,
        from_country: data.from.country,
        from_telephone: data.from.telephone,
        from_email: data.from.email,

        // ✅ Parcel details from Product
        parcel_items: parcelItems,
        weight: data.product.weight ?? 1,
        length: data.product.length ?? 10,
        width: data.product.width ?? 10,
        height: data.product.height ?? 10,

        // ✅ Shipping method chosen from Sendcloud API
        shipment: {
          id: data.shippingMethodId,
        },

        // ✅ Automatic label generation
        request_label: true,
        request_label_async: false,
        apply_shipping_rules: false,
      },
    };
    if (data.product.carrer_option === "service_point") {
      payload = {
        parcel: {
          // ✅ Delivery address
          name: data.to.name,
          company_name: data.to.company_name,
          email: data.to.email,
          telephone: data.to.telephone,
          address: data.to.address,
          house_number: data.to.house_number,
          address_2: data.to.address_2 || "",
          city: data.to.city,
          country: data.to.country,
          postal_code: data.to.postal_code,

          // ✅ Sender address
          // from_name: data.from.name,
          // from_company_name: data.from.company_name,
          // from_address_1: data.from.address,
          // from_address_2: data.from.address_2 || "",
          // from_house_number: data.from.house_number,
          // from_city: data.from.city,
          // from_postal_code: data.from.postal_code,
          // from_country: data.from.country,
          // from_telephone: data.from.telephone,
          // from_email: data.from.email,

          // ✅ Parcel details from Product
          parcel_items: parcelItems,
          weight: data.product.weight ?? 1,
          length: data.product.length ?? 10,
          width: data.product.width ?? 10,
          height: data.product.height ?? 10,

          // ✅ Shipping method chosen from Sendcloud API
          shipment: {
            id: data.shippingMethodId,
          },

          // ✅ Automatic label generation
          request_label: true,
          request_label_async: false,
          apply_shipping_rules: false,
        },
      };
    }

    // console.log(data);
    // ✅ Only add if exists
    if (data.to.service_point_id) {
      // console.log("Service point");
      payload.parcel.to_service_point = data.to.service_point_id;
    }
    // console.log(payload);
    this._logger.log(`Parcel Url`, this.panelUrl);
    this._logger.log("Parcel Payload", payload);
    try {
      const rawResponse = await fetch(
        `https://stoplight.io/mocks/sendcloud/sendcloud-public-api:v2/299107074/parcels`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${this.auth}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        }
      );
      // console.log(rawResponse);
      const response = rawResponse.json();
      if (!rawResponse.ok) {
        const errorText = await rawResponse.text();
        console.log("Error", errorText);
        this._logger.log(`Parcel Creation Error Text`, errorText);

        throw new Error(errorText);
      }

      return response;
    } catch (error) {
      // throw new Error()
      // console.log(error);
      this._logger.log(`Parcel Creation Error`, error);
      //   console.log(typeof error);
      throw new Error(error.message);
    }
  }

  async getParcelId({ parcelId }: { parcelId: number }) {
    if (!parcelId) {
      throw new Error("ParcelId not found");
    }
    try {
      const rawResponse = await fetch(`${this.panelUrl}/parcels/${parcelId}`, {
        method: "GET",
        headers: {
          Authorization: `Basic ${this.auth}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      if (!rawResponse.ok) {
        const errorText = await rawResponse.text();
        console.log("Error Text", errorText);

        throw new Error(errorText);
      }

      return rawResponse;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async updateParcelLabel({ parcelId }: { parcelId: number }) {
    if (!parcelId) {
      throw new Error("ParcelId not found");
    }
    const payload: any = {
      parcel: {
        id: parcelId,
        request_label: true,
      },
    };

    // this._logger.log("Parcel Payload", payload);
    // console.log(url);
    try {
      const rawResponse = await fetch(`${this.panelUrl}/parcels`, {
        method: "PUT",
        headers: {
          Authorization: `Basic ${this.auth}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!rawResponse.ok) {
        const errorText = await rawResponse.text();
        console.log("Error Text", errorText);

        throw new Error(errorText);
      }

      return payload;
    } catch (error) {
      // throw new Error()
      // console.log(error);
      throw new Error(error.message);
    }
  }
}
