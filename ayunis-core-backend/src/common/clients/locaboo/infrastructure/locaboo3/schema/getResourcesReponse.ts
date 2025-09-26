export type GetResourcesResponse = {
  data: Array<{
    id: number;
    title: string;
    parts: Array<{
      id: number;
      title: string;
    }>;
    free_text_fields: Array<{
      field_type: 'checkbox' | 'input' | 'file_upload' | 'select'; // TODO add more
      field_label: string;
      field_name: string; // format is "category_fields[<resource_id>][<field_id>]"
      field_config: {
        options: {
          [key: string]: { value: string };
        };
      };
    }>;
  }>;
};
