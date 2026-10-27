<?php

namespace Database\Seeders;

use App\Models\CategoryRule;
use App\Services\CsvStatementImporter;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $rules = [
            ['pattern' => 'UBER', 'category' => 'Transporte', 'priority' => 20],
            ['pattern' => 'IFOOD', 'category' => 'Alimentação', 'priority' => 25],
            ['pattern' => 'AWS', 'category' => 'Infraestrutura Cloud', 'priority' => 30],
            ['pattern' => 'GITHUB', 'category' => 'Ferramentas Dev', 'priority' => 30],
            ['pattern' => 'SALARIO', 'category' => 'Salário & Contratos', 'priority' => 50],
        ];

        foreach ($rules as $rule) {
            CategoryRule::query()->firstOrCreate(
                ['pattern' => $rule['pattern']],
                $rule
            );
        }

        $sampleCsv = implode("\n", [
            'date,description,amount_cents,type',
            '2026-10-05,SALARIO FULLSTACK LARAVEL VUE,1050000,income',
            '2026-10-08,AWS CLOUD SERVICES US-EAST,34500,expense',
            '2026-10-11,UBER TRIP CENTRO TECNOLOGICO,4290,expense',
            '2026-10-14,IFOOD RESTAURANTE EXECUTIVO,7850,expense',
            '2026-10-18,GITHUB COPILOT & ACTIONS,11500,expense',
        ]);

        app(CsvStatementImporter::class)->import($sampleCsv);
    }
}
