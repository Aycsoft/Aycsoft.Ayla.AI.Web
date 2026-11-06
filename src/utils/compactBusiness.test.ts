import { expect, test } from 'vitest'
import {
  compactBusiness,
  compactProduct,
  compactAmounts,
  recentPurchaseProducts,
} from './compactBusiness'

test('销量保留零值、原精度和每条币种，不补币种或相加', () => {
  const table = compactBusiness({
    ToolCode: 'sales_top_skus',
    Data: {
      Products: [
        {
          SKU: 's1',
          SalesQuantity: 0,
          SalesAmounts: [
            { Currency: 'USD', Amount: '0.00' },
            { Currency: 'GBP', Amount: '12.3456' },
          ],
        },
      ],
    },
  })!
  expect(table.cell(table.rows[0]!, 'SalesQuantity')).toBe('0')
  expect(table.cell(table.rows[0]!, 'SalesAmounts')).toBe('USD 0.00 / GBP 12.3456')
  expect(compactAmounts([{ Amount: 2 }])).toBe('币种未提供 2')
})
test('原图字段和短名称兼容，恶意地址及非唯一聚合产品不补图', () => {
  expect(
    compactProduct(
      { Sku: 's1', Name: '壁灯，E12', MainPicture: '2100836449170624512' },
      'https://erp.example',
    ),
  ).toMatchObject({
    sku: 's1',
    shortName: '壁灯',
    image: 'https://erp.example/api/resourceUrlApi/raw/2100836449170624512',
  })
  expect(
    compactProduct(
      { ProductSku: 's1', ProductMainPicture: 'https://img.example/a.jpg' },
      'https://erp.example',
    ).image,
  ).toBe('https://img.example/a.jpg')
  for (const MainPicture of [
    'javascript:alert(1)',
    '//evil.example/x',
    'https://user:secret@evil.example/x',
  ])
    expect(compactProduct({ MainPicture }, 'https://erp.example').image).toBe('')
  expect(
    compactProduct(
      { GroupLabel: 's1', ProductCount: 2, MainPicture: '123' },
      'https://erp.example',
      true,
    ).image,
  ).toBe('')
})
test('供应商仅展示对应采购信息，不把枚举ID或导航作为列', () => {
  const table = compactBusiness({
    ToolCode: 'supplier_lookup',
    Data: {
      Suppliers: [
        {
          SupplierName: '合成供应商',
          MainCategory: 6,
          RecentPurchasePlanNo: 'plan1',
          RecentPurchaseProducts: [{ Sku: 's1', Name: '壁灯' }],
          StreetAddress: 'hidden',
        },
      ],
    },
  })!
  expect(table.product).toBe(false)
  expect(table.columns.map((x) => x.key)).not.toContain('StreetAddress')
  expect(table.cell(table.rows[0]!, 'MainCategory')).toBe('—')
  expect(recentPurchaseProducts(table.rows[0]!)[0]!.Sku).toBe('s1')
})
test('补货展示真实缺口，缺数不补零；指标按实际分组和数值列展示', () => {
  const table = compactBusiness({
    ToolCode: 'inventory_risk_analysis',
    Data: {
      AnalysisType: 'demand_gap',
      Items: [{ ProductSku: 's1', AvailableQuantity: 0, TransitQuantity: 100, CoverageGap: 12 }],
    },
  })!
  expect(table.cell(table.rows[0]!, 'AvailableQuantity')).toBe('0')
  expect(table.cell(table.rows[0]!, 'CoverageGap')).toBe('12')
  expect(table.columns.some((c) => c.key === 'Sales7Days')).toBe(false)
  const metric = compactBusiness({
    ToolCode: 'business_metrics_query',
    Data: {
      Metric: 'available',
      GroupBy: 'category',
      Items: [{ GroupLabel: '壁灯', Available: 748, Transit: 0 }],
    },
  })!
  expect(metric.product).toBe(false)
  expect(metric.columns.map((x) => x.label)).toEqual(['分组', '现货', '在途'])
})
test('报价保留原币种和零价格，未支持合同不吞掉原展示', () => {
  const quote = compactBusiness({
    ToolCode: 'supplier_quotation_lookup',
    Data: { Quotations: [{ ProductSku: 's1', TaxInclusivePrice: 0, Currency: 'USD' }] },
  })!
  expect(quote.cell(quote.rows[0]!, 'TaxInclusivePrice')).toBe('USD 0')
  expect(compactBusiness({ ToolCode: 'unknown_tool', Data: { Items: [{}] } })).toBeNull()
})

test('原资源地址与camelCase主图逐行保持，不使用其他产品补图', () => {
  const origin = 'https://www.yueyaoinfo.com'
  const direct = `${origin}/api/resourceUrlApi/raw/2100836449170624512`
  expect(
    compactProduct(
      { mainPicture: '/api/resourceUrlApi/raw/2100836449170624512', categoryName: '壁灯' },
      origin,
    ),
  ).toMatchObject({ image: direct, category: '壁灯' })
  expect(compactProduct({ MainPicture: direct }, origin).image).toBe(direct)
  expect(compactProduct({ Sku: 'missing' }, origin).image).toBe('')
  expect(compactProduct({ Sku: 'other', MainPicture: '2100836449170624513' }, origin).image).toBe(
    `${origin}/api/resourceUrlApi/raw/2100836449170624513`,
  )
})

test('各主图合同兼容数字与字母数字原ID，URL字段不当作文件ID', () => {
  const origin = 'https://www.yueyaoinfo.com'
  for (const field of [
    'MainPicture',
    'mainPicture',
    'ProductMainPicture',
    'productMainPicture',
    'MainImageFileId',
    'mainImageFileId',
  ]) {
    for (const id of ['2100836449170624512', 'yc33602f44f295bf7cfd1b8405e446ad', 'file_ID-1'])
      expect(compactProduct({ [field]: id }, origin).image).toBe(
        `${origin}/api/resourceUrlApi/raw/${id}`,
      )
    for (const invalid of ['../secret', 'a?key=1', '//other.example/image', 'a b'])
      expect(compactProduct({ [field]: invalid }, origin).image).toBe('')
  }
  for (const field of ['MainImageUrl', 'PreviewUrl'])
    expect(compactProduct({ [field]: 'file_ID-1' }, origin).image).toBe('')
  expect(
    compactProduct({ MainImageUrl: 'invalid-address', MainPicture: 'file_ID-1' }, origin).image,
  ).toBe('')
})

test('补货Items与销量Products同样保留每行原主图，不受SKU或数值影响', () => {
  const origin = 'https://www.yueyaoinfo.com'
  for (const [ToolCode, rowsKey, pictureKey] of [
    ['inventory_risk_analysis', 'Items', 'MainPicture'],
    ['sales_top_skus', 'Products', 'MainImageFileId'],
  ]) {
    const table = compactBusiness({
      ToolCode: ToolCode!,
      Data: {
        [rowsKey!]: [
          { Sku: 'arbitrary-1', [pictureKey!]: 'synthetic_image_1', CoverageGap: 0 },
          { Sku: 'arbitrary-2', [pictureKey!]: 'synthetic_image_2', CoverageGap: 15 },
          { Sku: 'arbitrary-3' },
        ],
      },
    })!
    expect(table.rows.map((item) => compactProduct(item, origin, table.metrics).image)).toEqual([
      `${origin}/api/resourceUrlApi/raw/synthetic_image_1`,
      `${origin}/api/resourceUrlApi/raw/synthetic_image_2`,
      '',
    ])
  }
})

test('空字符串币种和供应商字段明确缺失，零值不丢失', () => {
  expect(compactAmounts([{ Currency: '', Amount: '0.00' }])).toBe('币种未提供 0.00')
  expect(compactAmounts([{ Currency: '  ', Amount: '12.3456' }])).toBe('币种未提供 12.3456')
  const table = compactBusiness({
    ToolCode: 'supplier_lookup',
    Data: {
      Suppliers: [
        { SupplierName: '合成供应商', MainCategory: '', RecentPurchaseDate: '', SupplierCode: 0 },
      ],
    },
  })!
  expect(table.cell(table.rows[0]!, 'MainCategory')).toBe('—')
  expect(table.cell(table.rows[0]!, 'RecentPurchaseDate')).toBe('—')
  expect(table.cell(table.rows[0]!, 'SupplierCode')).toBe('0')
})
